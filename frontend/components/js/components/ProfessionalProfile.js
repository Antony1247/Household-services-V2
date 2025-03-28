export default {
    template: `
    <div>
        <nav class="navbar navbar-dark bg-dark">
            <div class="container-fluid">
                <a class="navbar-brand" href="/#/professional-dashboard">Professional Dashboard</a>
                <div>
                    <router-link to="/assigned-requests" class="nav-link d-inline text-white">Accepted Requests</router-link>
                    <router-link to="/completed-requests" class="nav-link d-inline text-white">request history</router-link>
                    <router-link to="/professional-profile" class="nav-link d-inline text-white">My Profile</router-link>
                    <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                </div>
            </div>
        </nav>

        <div class="container mt-5">
            <h1 class="text-center">My Profile</h1>

            <div v-if="profile">
                <div class="card shadow p-4">
                    <h4>Profile Information</h4>
                    <p><strong>Full Name:</strong> {{ profile.full_name }}</p>
                    <p><strong>Email:</strong> {{ profile.email }}</p>
                    <p><strong>Phone:</strong> {{ profile.phone }}</p>
                    <p><strong>Address:</strong> {{ profile.address }}</p>
                    <p><strong>Specialization:</strong> {{ profile.specialization }}</p>
                    <p><strong>Experience:</strong> {{ profile.experience }} years</p>
                    <button class="btn btn-warning" @click="editMode = true">Edit Profile</button>
                    <button v-if="professionalId" class="btn btn-info ms-3" @click="viewProfessional">Professional Summary</button>
                </div>
            </div>

            <div v-if="editMode" class="card shadow p-4 mt-3">
                <h4>Edit Profile</h4>
                <form @submit.prevent="updateProfile">
                    <div class="mb-3">
                        <label>Full Name</label>
                        <input type="text" class="form-control" v-model="editData.full_name" required>
                    </div>
                    <div class="mb-3">
                        <label>Phone</label>
                        <input type="text" class="form-control" v-model="editData.phone" required>
                    </div>
                    <div class="mb-3">
                        <label>Address</label>
                        <input type="text" class="form-control" v-model="editData.address" required>
                    </div>
                    <div class="mb-3">
                        <label>Specialization</label>
                        <input type="text" class="form-control" v-model="editData.specialization" required>
                    </div>
                    <div class="mb-3">
                        <label>Experience (Years)</label>
                        <input type="number" class="form-control" v-model="editData.experience" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                    <button type="button" class="btn btn-secondary ms-3" @click="cancelEdit">Cancel</button>
                </form>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            profile: null,
            editMode: false,
            editData: {
                full_name: "",
                phone: "",
                address: "",
                specialization: "",
                experience: ""
            },
            professionalId: null // Store professional ID
        };
    },
    methods: {
        async fetchProfile() {
            try {
                const response = await axios.get('/api/professional_profile', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.profile = response.data;
                this.editData = { ...response.data };

                // Store professional ID for summary redirection
                this.professionalId = response.data.id;
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        },
        async updateProfile() {
            try {
                await axios.put('/api/professional_profile', this.editData, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                alert("Profile updated successfully!");
                this.editMode = false;
                this.fetchProfile();
            } catch (error) {
                console.error("Error updating profile:", error);
                alert("Failed to update profile.");
            }
        },
        cancelEdit() {
            this.editMode = false;
            this.editData = { ...this.profile };
        },
        viewProfessional() {
            if (this.professionalId) {
                this.$router.push(`/professionals/${this.professionalId}`);
            } else {
                console.error("Professional ID not found.");
            }
        },
        logout() {
            axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(() => {
                    localStorage.clear();
                    window.location.href = "/#/login";
                })
                .catch(error => console.error(error));
        }
    },
    mounted() {
        this.fetchProfile();
    }
};
