export default {
    template: `
        <div class="container mt-5">
            <h1 class="text-center">Login</h1>
            <div v-if="message" class="alert" :class="{'alert-danger': isError, 'alert-success': !isError}">{{ message }}</div>
            <form @submit.prevent="handleLogin">
                <div class="form-group">
                    <label>Email</label>
                    <input type="text" class="form-control" v-model="email" required>
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" class="form-control" v-model="password" required>
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select class="form-control" v-model="role" required>
                        <option value="Admin">Admin</option>
                        <option value="Customer">Customer</option>
                        <option value="Professional">Professional</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary btn-block">Login</button>
            </form>
        </div>
    `,
    data() {
        return { email: '', password: '', role: 'Customer', message: '', isError: false };
    },
    methods: {
        async handleLogin() {
            try {
                const response = await axios.post('/api/login', {
                    email: this.email,
                    password: this.password,
                    role: this.role
                });

                localStorage.setItem("token", response.data.token);
                localStorage.setItem("role", response.data.role);

                this.message = response.data.message;
                this.isError = false;

                // Redirect based on role
                if (response.data.role === "Admin") {
                    this.$router.push("/admin-dashboard");
                } else if (response.data.role === "Customer") {
                    this.$router.push("/customer-dashboard");
                } else if (response.data.role === "Professional") {
                    this.$router.push("/professional-dashboard");
                }
            } catch (error) {
                this.message = error.response.data.message || "Login failed";
                this.isError = true;
            }
        }
    }
};
