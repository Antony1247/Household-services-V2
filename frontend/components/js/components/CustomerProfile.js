export default {
    template: `
    <div>
        <nav class="navbar navbar-dark bg-dark">
            <div class="container-fluid">
                <a class="navbar-brand" href="/#/customer-dashboard">Customer Dashboard</a>
                <div>
                    <router-link to="/current-bookings" class="nav-link d-inline text-white">My Bookings</router-link>
                    <router-link to="/booking-history" class="nav-link d-inline text-white">Booking History</router-link>
                    <router-link to="/profile" class="nav-link d-inline text-white">My Profile</router-link>
                    <router-link to="/customer-search" class="nav-link d-inline text-white">Search</router-link>
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
                    <button class="btn btn-warning" @click="editMode = true">Edit Profile</button>
                    <button v-if="customerId" class="btn btn-info ms-3" @click="viewCustomer">Customer Summary</button>
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
                address: ""
            },
            customerId: null // Store customer ID
        };
    },
    methods: {
        async fetchProfile() {
            try {
                const response = await axios.get('/api/profile', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.profile = response.data;
                this.editData = { ...response.data };

                // Store customer ID for summary redirection
                this.customerId = response.data.id;
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        },
        async updateProfile() {
            try {
                await axios.put('/api/profile', this.editData, {
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
        viewCustomer() {
            if (this.customerId) {
                this.$router.push(`/customer/${this.customerId}`);
            } else {
                console.error("Customer ID not found.");
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
