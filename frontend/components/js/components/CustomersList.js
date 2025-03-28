export default {
    template: `
    <div>
        <!-- Admin Navbar -->
        <nav class="navbar navbar-dark bg-dark">
            <div class="container-fluid">
                <a class="navbar-brand" href="/#/admin-dashboard">Admin Dashboard</a>
                <div>
                    <router-link to="/servicesList" class="nav-link d-inline text-white">Manage Services</router-link>
                    <router-link to="/professionalsList" class="nav-link d-inline text-white">Manage Professionals</router-link>
                    <router-link to="/customers" class="nav-link d-inline text-white">Manage Customers</router-link>
                    <router-link to="/service-requests" class="nav-link d-inline text-white">service requests</router-link>
                    <router-link to="/export-service-requests" class="nav-link d-inline text-white">Export CSV</router-link>
                    <router-link to="/admin-search" class="nav-link d-inline text-white">Search</router-link>
                    <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                </div>
            </div>
        </nav>
        <div class="container mt-5">
            <h1 class="text-center">Customers List</h1>
            <table class="table table-bordered mt-3">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="customer in customers" :key="customer.id">
                        <td>{{ customer.id }}</td>
                        <td>{{ customer.full_name }}</td>
                        <td>{{ customer.email }}</td>
                        <td :class="{'text-danger': customer.status === 'Blocked', 'text-success': customer.status === 'Active'}">
                            {{ customer.status }}
                        </td>
                        <td>
                            <button class="btn btn-primary me-2" @click="viewCustomer(customer.id)">View</button>
                            <button class="btn btn-warning" @click="toggleBlock(customer)">
                                {{ customer.status === 'Blocked' ? 'Unblock' : 'Block' }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    `,
    data() {
        return {
            customers: []
        };
    },
    methods: {
        async fetchCustomers() {
            try {
                const response = await axios.get('/api/customers', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.customers = response.data.customers;
            } catch (error) {
                console.error("Error fetching customers:", error);
            }
        },
        async toggleBlock(customer) {
            try {
                const response = await axios.post(`/api/customers/block/${customer.id}`, {}, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                customer.status = response.data.blocked_status ? "Blocked" : "Active";
            } catch (error) {
                console.error("Error updating customer status:", error);
            }
        },
        viewCustomer(id) {
            this.$router.push(`/customer/${id}`);
        },
        logout() {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            this.$router.push("/login");
        }
    },
    mounted() {
        this.fetchCustomers();
    }
};
